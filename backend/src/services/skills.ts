import { promises as fs } from 'fs'
import path from 'path'
import { logger } from '../utils/logger'
import { getConfigPath } from '@opencode-manager/shared/config/env'

export interface SkillMetadata {
  name: string
  description: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
}

export interface Skill extends SkillMetadata {
  content: string
  scope: 'project' | 'global'
  path: string
}

export interface CreateSkillRequest {
  name: string
  description: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  content: string
}

export interface UpdateSkillRequest {
  description?: string
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  content?: string
}

const SKILL_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function validateSkillName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Skill name is required' }
  }
  if (name.length > 64) {
    return { valid: false, error: 'Skill name must be 64 characters or less' }
  }
  if (!SKILL_NAME_REGEX.test(name)) {
    return { 
      valid: false, 
      error: 'Skill name must be lowercase alphanumeric with single hyphen separators (e.g., "git-release")' 
    }
  }
  return { valid: true }
}

export function validateSkillDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.length === 0) {
    return { valid: false, error: 'Skill description is required' }
  }
  if (description.length > 1024) {
    return { valid: false, error: 'Skill description must be 1024 characters or less' }
  }
  return { valid: true }
}

function parseYamlFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content }
  }
  
  const yamlContent = frontmatterMatch[1] ?? ''
  const body = frontmatterMatch[2] ?? ''
  
  const frontmatter: Record<string, unknown> = {}
  const lines = yamlContent.split('\n')
  let currentKey = ''
  let inMetadata = false
  const metadataObj: Record<string, string> = {}
  
  for (const line of lines) {
    if (line.trim() === '') continue
    
    if (line.startsWith('  ') && inMetadata) {
      const metaMatch = line.match(/^\s+(\w+):\s*(.*)$/)
      if (metaMatch && metaMatch[1] && metaMatch[2] !== undefined) {
        metadataObj[metaMatch[1]] = metaMatch[2].trim()
      }
      continue
    }
    
    inMetadata = false
    
    const keyValueMatch = line.match(/^(\w+):\s*(.*)$/)
    if (keyValueMatch && keyValueMatch[1] && keyValueMatch[2] !== undefined) {
      currentKey = keyValueMatch[1]
      const value = keyValueMatch[2].trim()
      
      if (currentKey === 'metadata' && value === '') {
        inMetadata = true
        frontmatter.metadata = metadataObj
      } else {
        frontmatter[currentKey] = value
      }
    }
  }
  
  if (Object.keys(metadataObj).length > 0) {
    frontmatter.metadata = metadataObj
  }
  
  return { frontmatter, body }
}

function buildSkillMd(skill: CreateSkillRequest | (SkillMetadata & { content: string })): string {
  let yaml = '---\n'
  yaml += `name: ${skill.name}\n`
  yaml += `description: ${skill.description}\n`
  
  if (skill.license) {
    yaml += `license: ${skill.license}\n`
  }
  if (skill.compatibility) {
    yaml += `compatibility: ${skill.compatibility}\n`
  }
  if (skill.metadata && Object.keys(skill.metadata).length > 0) {
    yaml += 'metadata:\n'
    for (const [key, value] of Object.entries(skill.metadata)) {
      yaml += `  ${key}: ${value}\n`
    }
  }
  
  yaml += '---\n'
  
  const content = skill.content.trim()
  if (content) {
    yaml += '\n' + content + '\n'
  }
  
  return yaml
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function getGlobalSkillsPath(): string {
  return path.join(getConfigPath(), 'skill')
}

function getProjectSkillsPath(directory: string): string {
  return path.join(directory, '.opencode', 'skill')
}

export class SkillsService {
  async listGlobalSkills(): Promise<Skill[]> {
    const skillsPath = getGlobalSkillsPath()
    return this.listSkillsFromPath(skillsPath, 'global')
  }

  async listProjectSkills(directory: string): Promise<Skill[]> {
    const skillsPath = getProjectSkillsPath(directory)
    return this.listSkillsFromPath(skillsPath, 'project')
  }

  private async listSkillsFromPath(skillsPath: string, scope: 'project' | 'global'): Promise<Skill[]> {
    const skills: Skill[] = []
    
    if (!(await directoryExists(skillsPath))) {
      return skills
    }
    
    try {
      const entries = await fs.readdir(skillsPath, { withFileTypes: true })
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        
        const skillMdPath = path.join(skillsPath, entry.name, 'SKILL.md')
        if (!(await fileExists(skillMdPath))) continue
        
        try {
          const content = await fs.readFile(skillMdPath, 'utf8')
          const { frontmatter, body } = parseYamlFrontmatter(content)
          
          const name = frontmatter.name as string || entry.name
          const description = frontmatter.description as string || ''
          
          if (name !== entry.name) {
            logger.warn(`Skill name mismatch: directory "${entry.name}" vs frontmatter "${name}"`)
          }
          
          skills.push({
            name: entry.name,
            description,
            license: frontmatter.license as string | undefined,
            compatibility: frontmatter.compatibility as string | undefined,
            metadata: frontmatter.metadata as Record<string, string> | undefined,
            content: body.trim(),
            scope,
            path: skillMdPath,
          })
        } catch (err) {
          logger.error(`Failed to parse skill at ${skillMdPath}:`, err)
        }
      }
    } catch (err) {
      logger.error(`Failed to list skills from ${skillsPath}:`, err)
    }
    
    return skills
  }

  async getGlobalSkill(name: string): Promise<Skill | null> {
    const skillsPath = getGlobalSkillsPath()
    return this.getSkillFromPath(skillsPath, name, 'global')
  }

  async getProjectSkill(name: string, directory: string): Promise<Skill | null> {
    const skillsPath = getProjectSkillsPath(directory)
    return this.getSkillFromPath(skillsPath, name, 'project')
  }

  private async getSkillFromPath(skillsPath: string, name: string, scope: 'project' | 'global'): Promise<Skill | null> {
    const skillMdPath = path.join(skillsPath, name, 'SKILL.md')
    
    if (!(await fileExists(skillMdPath))) {
      return null
    }
    
    try {
      const content = await fs.readFile(skillMdPath, 'utf8')
      const { frontmatter, body } = parseYamlFrontmatter(content)
      
      return {
        name,
        description: frontmatter.description as string || '',
        license: frontmatter.license as string | undefined,
        compatibility: frontmatter.compatibility as string | undefined,
        metadata: frontmatter.metadata as Record<string, string> | undefined,
        content: body.trim(),
        scope,
        path: skillMdPath,
      }
    } catch (err) {
      logger.error(`Failed to read skill ${name}:`, err)
      return null
    }
  }

  async createGlobalSkill(skill: CreateSkillRequest): Promise<Skill> {
    const skillsPath = getGlobalSkillsPath()
    return this.createSkillAtPath(skillsPath, skill, 'global')
  }

  async createProjectSkill(skill: CreateSkillRequest, directory: string): Promise<Skill> {
    const skillsPath = getProjectSkillsPath(directory)
    return this.createSkillAtPath(skillsPath, skill, 'project')
  }

  private async createSkillAtPath(skillsPath: string, skill: CreateSkillRequest, scope: 'project' | 'global'): Promise<Skill> {
    const nameValidation = validateSkillName(skill.name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }
    
    const descValidation = validateSkillDescription(skill.description)
    if (!descValidation.valid) {
      throw new Error(descValidation.error)
    }
    
    const skillDir = path.join(skillsPath, skill.name)
    const skillMdPath = path.join(skillDir, 'SKILL.md')
    
    if (await fileExists(skillMdPath)) {
      throw new Error(`Skill "${skill.name}" already exists`)
    }
    
    await fs.mkdir(skillDir, { recursive: true })
    
    const content = buildSkillMd(skill)
    await fs.writeFile(skillMdPath, content, 'utf8')
    
    logger.info(`Created skill "${skill.name}" at ${skillMdPath}`)
    
    return {
      ...skill,
      scope,
      path: skillMdPath,
    }
  }

  async updateGlobalSkill(name: string, updates: UpdateSkillRequest): Promise<Skill | null> {
    const skillsPath = getGlobalSkillsPath()
    return this.updateSkillAtPath(skillsPath, name, updates, 'global')
  }

  async updateProjectSkill(name: string, updates: UpdateSkillRequest, directory: string): Promise<Skill | null> {
    const skillsPath = getProjectSkillsPath(directory)
    return this.updateSkillAtPath(skillsPath, name, updates, 'project')
  }

  private async updateSkillAtPath(skillsPath: string, name: string, updates: UpdateSkillRequest, scope: 'project' | 'global'): Promise<Skill | null> {
    const existing = await this.getSkillFromPath(skillsPath, name, scope)
    if (!existing) {
      return null
    }
    
    if (updates.description !== undefined) {
      const descValidation = validateSkillDescription(updates.description)
      if (!descValidation.valid) {
        throw new Error(descValidation.error)
      }
    }
    
    const updated: Skill = {
      ...existing,
      description: updates.description ?? existing.description,
      license: updates.license ?? existing.license,
      compatibility: updates.compatibility ?? existing.compatibility,
      metadata: updates.metadata ?? existing.metadata,
      content: updates.content ?? existing.content,
    }
    
    const content = buildSkillMd(updated)
    await fs.writeFile(existing.path, content, 'utf8')
    
    logger.info(`Updated skill "${name}" at ${existing.path}`)
    
    return updated
  }

  async deleteGlobalSkill(name: string): Promise<boolean> {
    const skillsPath = getGlobalSkillsPath()
    return this.deleteSkillAtPath(skillsPath, name)
  }

  async deleteProjectSkill(name: string, directory: string): Promise<boolean> {
    const skillsPath = getProjectSkillsPath(directory)
    return this.deleteSkillAtPath(skillsPath, name)
  }

  private async deleteSkillAtPath(skillsPath: string, name: string): Promise<boolean> {
    const skillDir = path.join(skillsPath, name)
    
    if (!(await directoryExists(skillDir))) {
      return false
    }
    
    await fs.rm(skillDir, { recursive: true, force: true })
    logger.info(`Deleted skill "${name}" at ${skillDir}`)
    
    return true
  }
}

export const skillsService = new SkillsService()

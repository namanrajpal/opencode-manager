import axios from 'axios'
import { API_BASE_URL } from '@/config'

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

export interface SkillValidationResult {
  valid: boolean
  error?: string
}

export const skillsApi = {
  listGlobalSkills: async (): Promise<Skill[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/skills/global`)
    return data
  },

  listProjectSkills: async (directory: string): Promise<Skill[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/skills/project`, {
      params: { directory },
    })
    return data
  },

  getGlobalSkill: async (name: string): Promise<Skill> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/skills/global/${encodeURIComponent(name)}`)
    return data
  },

  getProjectSkill: async (name: string, directory: string): Promise<Skill> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/skills/project/${encodeURIComponent(name)}`, {
      params: { directory },
    })
    return data
  },

  createGlobalSkill: async (skill: CreateSkillRequest): Promise<Skill> => {
    const { data } = await axios.post(`${API_BASE_URL}/api/skills/global`, skill)
    return data
  },

  createProjectSkill: async (skill: CreateSkillRequest, directory: string): Promise<Skill> => {
    const { data } = await axios.post(`${API_BASE_URL}/api/skills/project`, skill, {
      params: { directory },
    })
    return data
  },

  updateGlobalSkill: async (name: string, updates: UpdateSkillRequest): Promise<Skill> => {
    const { data } = await axios.put(
      `${API_BASE_URL}/api/skills/global/${encodeURIComponent(name)}`,
      updates
    )
    return data
  },

  updateProjectSkill: async (name: string, updates: UpdateSkillRequest, directory: string): Promise<Skill> => {
    const { data } = await axios.put(
      `${API_BASE_URL}/api/skills/project/${encodeURIComponent(name)}`,
      updates,
      { params: { directory } }
    )
    return data
  },

  deleteGlobalSkill: async (name: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/skills/global/${encodeURIComponent(name)}`)
  },

  deleteProjectSkill: async (name: string, directory: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/api/skills/project/${encodeURIComponent(name)}`, {
      params: { directory },
    })
  },

  validateName: async (name: string): Promise<SkillValidationResult> => {
    const { data } = await axios.get(`${API_BASE_URL}/api/skills/validate-name`, {
      params: { name },
    })
    return data
  },
}

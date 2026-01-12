import { Hono } from 'hono'
import { z } from 'zod'
import { skillsService, validateSkillName, validateSkillDescription } from '../services/skills'
import { logger } from '../utils/logger'

const CreateSkillSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(1024),
  license: z.string().optional(),
  compatibility: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  content: z.string().default(''),
})

const UpdateSkillSchema = z.object({
  description: z.string().min(1).max(1024).optional(),
  license: z.string().optional(),
  compatibility: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  content: z.string().optional(),
})

export function createSkillsRoutes() {
  const app = new Hono()

  app.get('/global', async (c) => {
    try {
      const skills = await skillsService.listGlobalSkills()
      return c.json(skills)
    } catch (error) {
      logger.error('Failed to list global skills:', error)
      return c.json({ error: 'Failed to list global skills' }, 500)
    }
  })

  app.get('/project', async (c) => {
    try {
      const directory = c.req.query('directory')
      if (!directory) {
        return c.json({ error: 'directory query parameter is required' }, 400)
      }
      
      const skills = await skillsService.listProjectSkills(directory)
      return c.json(skills)
    } catch (error) {
      logger.error('Failed to list project skills:', error)
      return c.json({ error: 'Failed to list project skills' }, 500)
    }
  })

  app.get('/global/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const skill = await skillsService.getGlobalSkill(name)
      
      if (!skill) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json(skill)
    } catch (error) {
      logger.error('Failed to get global skill:', error)
      return c.json({ error: 'Failed to get global skill' }, 500)
    }
  })

  app.get('/project/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const directory = c.req.query('directory')
      
      if (!directory) {
        return c.json({ error: 'directory query parameter is required' }, 400)
      }
      
      const skill = await skillsService.getProjectSkill(name, directory)
      
      if (!skill) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json(skill)
    } catch (error) {
      logger.error('Failed to get project skill:', error)
      return c.json({ error: 'Failed to get project skill' }, 500)
    }
  })

  app.post('/global', async (c) => {
    try {
      const body = await c.req.json()
      const validated = CreateSkillSchema.parse(body)
      
      const nameValidation = validateSkillName(validated.name)
      if (!nameValidation.valid) {
        return c.json({ error: nameValidation.error }, 400)
      }
      
      const descValidation = validateSkillDescription(validated.description)
      if (!descValidation.valid) {
        return c.json({ error: descValidation.error }, 400)
      }
      
      const skill = await skillsService.createGlobalSkill(validated)
      return c.json(skill, 201)
    } catch (error) {
      logger.error('Failed to create global skill:', error)
      
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid skill data', details: error.issues }, 400)
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        return c.json({ error: error.message }, 409)
      }
      
      return c.json({ error: 'Failed to create global skill' }, 500)
    }
  })

  app.post('/project', async (c) => {
    try {
      const directory = c.req.query('directory')
      if (!directory) {
        return c.json({ error: 'directory query parameter is required' }, 400)
      }
      
      const body = await c.req.json()
      const validated = CreateSkillSchema.parse(body)
      
      const nameValidation = validateSkillName(validated.name)
      if (!nameValidation.valid) {
        return c.json({ error: nameValidation.error }, 400)
      }
      
      const descValidation = validateSkillDescription(validated.description)
      if (!descValidation.valid) {
        return c.json({ error: descValidation.error }, 400)
      }
      
      const skill = await skillsService.createProjectSkill(validated, directory)
      return c.json(skill, 201)
    } catch (error) {
      logger.error('Failed to create project skill:', error)
      
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid skill data', details: error.issues }, 400)
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        return c.json({ error: error.message }, 409)
      }
      
      return c.json({ error: 'Failed to create project skill' }, 500)
    }
  })

  app.put('/global/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const body = await c.req.json()
      const validated = UpdateSkillSchema.parse(body)
      
      if (validated.description !== undefined) {
        const descValidation = validateSkillDescription(validated.description)
        if (!descValidation.valid) {
          return c.json({ error: descValidation.error }, 400)
        }
      }
      
      const skill = await skillsService.updateGlobalSkill(name, validated)
      
      if (!skill) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json(skill)
    } catch (error) {
      logger.error('Failed to update global skill:', error)
      
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid skill data', details: error.issues }, 400)
      }
      
      return c.json({ error: 'Failed to update global skill' }, 500)
    }
  })

  app.put('/project/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const directory = c.req.query('directory')
      
      if (!directory) {
        return c.json({ error: 'directory query parameter is required' }, 400)
      }
      
      const body = await c.req.json()
      const validated = UpdateSkillSchema.parse(body)
      
      if (validated.description !== undefined) {
        const descValidation = validateSkillDescription(validated.description)
        if (!descValidation.valid) {
          return c.json({ error: descValidation.error }, 400)
        }
      }
      
      const skill = await skillsService.updateProjectSkill(name, validated, directory)
      
      if (!skill) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json(skill)
    } catch (error) {
      logger.error('Failed to update project skill:', error)
      
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Invalid skill data', details: error.issues }, 400)
      }
      
      return c.json({ error: 'Failed to update project skill' }, 500)
    }
  })

  app.delete('/global/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const deleted = await skillsService.deleteGlobalSkill(name)
      
      if (!deleted) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to delete global skill:', error)
      return c.json({ error: 'Failed to delete global skill' }, 500)
    }
  })

  app.delete('/project/:name', async (c) => {
    try {
      const name = c.req.param('name')
      const directory = c.req.query('directory')
      
      if (!directory) {
        return c.json({ error: 'directory query parameter is required' }, 400)
      }
      
      const deleted = await skillsService.deleteProjectSkill(name, directory)
      
      if (!deleted) {
        return c.json({ error: 'Skill not found' }, 404)
      }
      
      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to delete project skill:', error)
      return c.json({ error: 'Failed to delete project skill' }, 500)
    }
  })

  app.get('/validate-name', async (c) => {
    const name = c.req.query('name') || ''
    const result = validateSkillName(name)
    return c.json(result)
  })

  return app
}

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { skillsApi, type Skill, type CreateSkillRequest, type UpdateSkillRequest } from '@/api/skills'
import { showToast } from '@/lib/toast'

interface SkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: Skill | null
  scope: 'project' | 'global'
  directory?: string
}

const SKILL_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function SkillDialog({ open, onOpenChange, skill, scope, directory }: SkillDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!skill

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [license, setLicense] = useState('')
  const [compatibility, setCompatibility] = useState('')
  const [content, setContent] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (skill) {
        setName(skill.name)
        setDescription(skill.description)
        setLicense(skill.license || '')
        setCompatibility(skill.compatibility || '')
        setContent(skill.content || '')
      } else {
        setName('')
        setDescription('')
        setLicense('')
        setCompatibility('')
        setContent('')
      }
      setNameError(null)
    }
  }, [open, skill])

  const validateName = (value: string): boolean => {
    if (!value) {
      setNameError('Name is required')
      return false
    }
    if (value.length > 64) {
      setNameError('Name must be 64 characters or less')
      return false
    }
    if (!SKILL_NAME_REGEX.test(value)) {
      setNameError('Use lowercase letters, numbers, and single hyphens (e.g., "git-release")')
      return false
    }
    setNameError(null)
    return true
  }

  const handleNameChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setName(normalized)
    if (normalized) {
      validateName(normalized)
    } else {
      setNameError(null)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: CreateSkillRequest) => {
      if (scope === 'global') {
        return skillsApi.createGlobalSkill(data)
      } else {
        if (!directory) throw new Error('Directory is required for project skills')
        return skillsApi.createProjectSkill(data, directory)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', scope, directory] })
      showToast.success(`Skill "${name}" created successfully`)
      onOpenChange(false)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create skill'
      showToast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateSkillRequest) => {
      if (scope === 'global') {
        return skillsApi.updateGlobalSkill(name, data)
      } else {
        if (!directory) throw new Error('Directory is required for project skills')
        return skillsApi.updateProjectSkill(name, data, directory)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', scope, directory] })
      showToast.success(`Skill "${name}" updated successfully`)
      onOpenChange(false)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update skill'
      showToast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateName(name)) return
    if (!description.trim()) {
      showToast.error('Description is required')
      return
    }
    if (description.length > 1024) {
      showToast.error('Description must be 1024 characters or less')
      return
    }

    if (isEditing) {
      updateMutation.mutate({
        description,
        license: license || undefined,
        compatibility: compatibility || undefined,
        content,
      })
    } else {
      createMutation.mutate({
        name,
        description,
        license: license || undefined,
        compatibility: compatibility || undefined,
        content,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Skill' : 'Create New Skill'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Update the "${skill?.name}" skill configuration`
              : `Create a new ${scope} skill that agents can use`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="my-skill-name"
              disabled={isEditing}
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && (
              <p className="text-xs text-red-500">{nameError}</p>
            )}
            {!nameError && !isEditing && (
              <p className="text-xs text-muted-foreground">
                Lowercase alphanumeric with hyphens (e.g., "git-release", "code-review")
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description * <span className="text-muted-foreground text-xs">({description.length}/1024)</span></Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this skill do? Be specific so agents know when to use it."
              rows={2}
              maxLength={1024}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Input
                id="license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="MIT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compatibility">Compatibility</Label>
              <Input
                id="compatibility"
                value={compatibility}
                onChange={(e) => setCompatibility(e.target.value)}
                placeholder="opencode"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Instructions (Markdown)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`## What I do

- Task 1
- Task 2

## When to use me

Use this skill when...`}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Markdown content that will be shown to the agent when this skill is loaded
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Skill' : 'Create Skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

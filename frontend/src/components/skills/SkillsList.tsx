import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Pencil, Trash2, Zap, AlertCircle } from 'lucide-react'
import { skillsApi, type Skill } from '@/api/skills'
import { SkillDialog } from './SkillDialog'
import { showToast } from '@/lib/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SkillsListProps {
  scope: 'project' | 'global'
  directory?: string
}

export function SkillsList({ scope, directory }: SkillsListProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [deleteSkill, setDeleteSkill] = useState<Skill | null>(null)

  const { data: skills = [], isLoading, error } = useQuery({
    queryKey: ['skills', scope, directory],
    queryFn: () => {
      if (scope === 'global') {
        return skillsApi.listGlobalSkills()
      } else {
        if (!directory) return Promise.resolve([])
        return skillsApi.listProjectSkills(directory)
      }
    },
    enabled: scope === 'global' || !!directory,
  })

  const deleteMutation = useMutation({
    mutationFn: async (skill: Skill) => {
      if (scope === 'global') {
        return skillsApi.deleteGlobalSkill(skill.name)
      } else {
        if (!directory) throw new Error('Directory is required')
        return skillsApi.deleteProjectSkill(skill.name, directory)
      }
    },
    onSuccess: (_, skill) => {
      queryClient.invalidateQueries({ queryKey: ['skills', scope, directory] })
      showToast.success(`Skill "${skill.name}" deleted`)
      setDeleteSkill(null)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete skill'
      showToast.error(message)
    },
  })

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingSkill(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingSkill(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading skills...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">Failed to load skills</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {skills.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No {scope} skills configured</p>
          <p className="text-xs mt-1">
            {scope === 'project' 
              ? 'Add skills specific to this repository'
              : 'Add skills available to all repositories'
            }
          </p>
          <Button onClick={handleCreate} size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{skill.name}</p>
                    {skill.license && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {skill.license}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {skill.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(skill)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => setDeleteSkill(skill)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleCreate} variant="outline" size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        </>
      )}

      <SkillDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        skill={editingSkill}
        scope={scope}
        directory={directory}
      />

      <AlertDialog open={!!deleteSkill} onOpenChange={(open: boolean) => !open && setDeleteSkill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the skill "{deleteSkill?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSkill && deleteMutation.mutate(deleteSkill)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

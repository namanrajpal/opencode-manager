import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, Shield, Info } from 'lucide-react'
import { settingsApi } from '@/api/settings'
import { showToast } from '@/lib/toast'
import type { OpenCodeConfig } from '@/api/types/settings'

type SkillPermission = 'allow' | 'deny' | 'ask'

interface SkillPermissionsEditorProps {
  config: OpenCodeConfig | null
}

export function SkillPermissionsEditor({ config }: SkillPermissionsEditorProps) {
  const queryClient = useQueryClient()
  const [newPattern, setNewPattern] = useState('')
  const [newPermission, setNewPermission] = useState<SkillPermission>('allow')

  const permissions = (config?.content?.permission as Record<string, unknown>)?.skill as Record<string, SkillPermission> | undefined || {}
  const permissionEntries = Object.entries(permissions)

  const updateMutation = useMutation({
    mutationFn: async (newPermissions: Record<string, SkillPermission>) => {
      if (!config) throw new Error('No config loaded')
      
      const currentPermission = (config.content.permission as Record<string, unknown>) || {}
      const updatedContent = {
        ...config.content,
        permission: {
          ...currentPermission,
          skill: newPermissions,
        },
      }
      
      return settingsApi.updateOpenCodeConfig(config.name, {
        content: updatedContent,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opencode-config'] })
      showToast.success('Skill permissions updated')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update permissions'
      showToast.error(message)
    },
  })

  const handleAddPermission = () => {
    if (!newPattern.trim()) {
      showToast.error('Pattern is required')
      return
    }

    if (permissions[newPattern]) {
      showToast.error('This pattern already exists')
      return
    }

    const updated = {
      ...permissions,
      [newPattern]: newPermission,
    }

    updateMutation.mutate(updated)
    setNewPattern('')
    setNewPermission('allow')
  }

  const handleUpdatePermission = (pattern: string, permission: SkillPermission) => {
    const updated = {
      ...permissions,
      [pattern]: permission,
    }
    updateMutation.mutate(updated)
  }

  const handleDeletePermission = (pattern: string) => {
    const updated = { ...permissions }
    delete updated[pattern]
    updateMutation.mutate(updated)
  }

  if (!config) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No OpenCode config loaded</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-200">
          <p className="font-medium mb-1">Permission patterns</p>
          <ul className="space-y-0.5 text-blue-300">
            <li><strong>allow</strong> - Skill loads immediately</li>
            <li><strong>deny</strong> - Skill hidden from agent</li>
            <li><strong>ask</strong> - User prompted for approval</li>
          </ul>
          <p className="mt-2">Use <code className="bg-blue-500/20 px-1 rounded">*</code> for wildcards: <code className="bg-blue-500/20 px-1 rounded">internal-*</code> matches all skills starting with "internal-"</p>
        </div>
      </div>

      {permissionEntries.length > 0 ? (
        <div className="space-y-2">
          {permissionEntries.map(([pattern, permission]) => (
            <div
              key={pattern}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card"
            >
              <code className="flex-1 text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                {pattern}
              </code>
              <Select
                value={permission}
                onValueChange={(value) => handleUpdatePermission(pattern, value as SkillPermission)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">allow</SelectItem>
                  <SelectItem value="deny">deny</SelectItem>
                  <SelectItem value="ask">ask</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => handleDeletePermission(pattern)}
                disabled={updateMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No permission rules configured</p>
          <p className="text-xs mt-1">All skills are allowed by default</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Input
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="Pattern (e.g., internal-*, pr-review)"
          className="flex-1 font-mono text-sm"
          disabled={updateMutation.isPending}
        />
        <Select
          value={newPermission}
          onValueChange={(value) => setNewPermission(value as SkillPermission)}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="allow">allow</SelectItem>
            <SelectItem value="deny">deny</SelectItem>
            <SelectItem value="ask">ask</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleAddPermission}
          size="icon"
          disabled={updateMutation.isPending || !newPattern.trim()}
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

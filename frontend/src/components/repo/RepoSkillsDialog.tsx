import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkillsList } from '@/components/skills/SkillsList'
import { SkillPermissionsEditor } from '@/components/skills/SkillPermissionsEditor'
import type { OpenCodeConfig } from '@/api/types/settings'

interface RepoSkillsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: OpenCodeConfig | null
  directory: string | undefined
}

export function RepoSkillsDialog({ open, onOpenChange, config, directory }: RepoSkillsDialogProps) {
  const [activeTab, setActiveTab] = useState('project')

  if (!directory) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileFullscreen className="sm:inset-auto sm:left-[50%] sm:top-[50%] sm:w-[500px] sm:max-w-[500px] sm:h-auto sm:max-h-[85vh] flex flex-col gap-0 pb-safe">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3 shrink-0">
          <DialogTitle>Agent Skills</DialogTitle>
          <DialogDescription>
            Configure reusable instructions that agents can load on-demand
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 sm:mx-6 grid grid-cols-3 shrink-0">
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4">
            <TabsContent value="project" className="mt-0 h-full">
              <div className="mb-3">
                <p className="text-xs text-muted-foreground">
                  Skills specific to this repository. Stored in <code className="bg-muted px-1 rounded">.opencode/skill/</code>
                </p>
              </div>
              <SkillsList scope="project" directory={directory} />
            </TabsContent>

            <TabsContent value="global" className="mt-0 h-full">
              <div className="mb-3">
                <p className="text-xs text-muted-foreground">
                  Skills available to all repositories. Stored in global config.
                </p>
              </div>
              <SkillsList scope="global" />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 h-full">
              <div className="mb-3">
                <p className="text-xs text-muted-foreground">
                  Control which skills agents can access using pattern-based rules.
                </p>
              </div>
              <SkillPermissionsEditor config={config} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

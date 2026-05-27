'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { createProjectFromTemplate } from '@/lib/project-import-export';
import type { ProjectTemplate, ExtendedProject } from '@/lib/database.types';
import { Zap, Copy, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (template: ProjectTemplate) => void;
  onCreateFromTemplate?: (projectId: string, template: ProjectTemplate) => void;
}

export function ProjectTemplatesDialog({ 
  open, 
  onOpenChange, 
  onSelect,
  onCreateFromTemplate 
}: ProjectTemplatesDialogProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as ProjectTemplate[]) || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!selectedTemplate || !projectName) return;

    setCreating(true);
    try {
      const userId = 'current-user-id'; // TODO: Get from auth context
      
      const newProject = await createProjectFromTemplate(
        selectedTemplate.id,
        {
          name: projectName,
          description: selectedTemplate.description,
          category: selectedTemplate.category,
        },
        userId
      );

      toast({
        title: 'Success',
        description: 'Project created from template',
      });

      onCreateFromTemplate?.(newProject.id, selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
      setProjectName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      marketing: 'bg-pink-100 text-pink-800',
      development: 'bg-blue-100 text-blue-800',
      sales: 'bg-green-100 text-green-800',
      operations: 'bg-purple-100 text-purple-800',
      hr: 'bg-indigo-100 text-indigo-800',
      finance: 'bg-amber-100 text-amber-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category || 'general'] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Templates</DialogTitle>
          <DialogDescription>
            Choose a template to quickly create a new project
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No templates available yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Zap className="w-5 h-5 text-yellow-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        {template.category && (
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        )}
                        {template.custom_fields && (
                          <Badge variant="outline">
                            {template.custom_fields.length} fields
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Badge className={getCategoryColor(selectedTemplate.category)}>
                    {selectedTemplate.category || 'General'}
                  </Badge>
                  {selectedTemplate.custom_fields && (
                    <p className="text-sm text-gray-600">
                      Includes {selectedTemplate.custom_fields.length} pre-configured fields
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded text-sm text-blue-900">
              <p className="font-medium mb-1">What will be included:</p>
              <ul className="space-y-1 text-xs">
                <li>✓ Project structure and settings</li>
                <li>✓ Custom fields and columns</li>
                <li>✓ Task templates and workflows</li>
                {selectedTemplate.custom_fields && (
                  <li>✓ {selectedTemplate.custom_fields.length} pre-configured fields</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {selectedTemplate && (
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Back
            </Button>
          )}
          {!selectedTemplate ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!projectName || creating}
              >
                <Plus className="w-4 h-4 mr-2" />
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTemplateGallery() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from('project_templates')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      setTemplates((data as ProjectTemplate[]) || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading templates...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Zap className="w-4 h-4 text-yellow-500" />
            </div>
            <CardDescription className="text-xs">{template.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {template.category && (
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              )}
              {template.custom_fields && (
                <Badge variant="outline" className="text-xs">
                  {template.custom_fields.length} fields
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

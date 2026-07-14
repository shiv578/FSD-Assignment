'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import type { Project, Task } from '@/types';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(180),
  description: z.string().max(10000).optional(),
});
type TaskFormValues = z.infer<typeof taskSchema>;

export default function ProjectDetailsPage() {
  const { projectId } = useParams() as { projectId: string };
  const client = useQueryClient();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api<Task[]>(`/projects/${projectId}/tasks`),
  });

  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema) });

  const createTask = async (values: TaskFormValues) => {
    try {
      await api(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      form.reset();
      await client.invalidateQueries({ queryKey: ['tasks', projectId] });
    } catch {
      form.setError('root', { message: 'Unable to create task' });
    }
  };

  if (projectLoading || tasksLoading) {
    return <p className="text-sm text-slate-500">Loading project...</p>;
  }

  if (!project) {
    return <p className="text-sm text-red-500">Project not found</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
            {project.key}
          </span>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
        </div>
        <p className="mt-2 text-slate-500">{project.description || 'No description provided.'}</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Create new task</h2>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={form.handleSubmit(createTask)}
        >
          <div>
            <Input placeholder="Task title" {...form.register('title')} />
            {form.formState.errors.title && (
              <span className="text-xs text-red-600">{form.formState.errors.title.message}</span>
            )}
          </div>
          <div>
            <Input placeholder="Description (optional)" {...form.register('description')} />
            {form.formState.errors.description && (
              <span className="text-xs text-red-600">
                {form.formState.errors.description.message}
              </span>
            )}
          </div>
          <Button disabled={form.formState.isSubmitting}>Create task</Button>
          {form.formState.errors.root && (
            <p className="text-sm text-red-600 col-span-3">{form.formState.errors.root.message}</p>
          )}
        </form>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Tasks</h2>
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link key={task._id} href={`/tasks/${task._id}`}>
              <Card className="flex items-center justify-between p-4 hover:bg-muted transition-colors mb-3">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {task.status?.replace('_', ' ') || 'todo'} · {task.priority || 'medium'}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
          {tasks.length === 0 && (
            <p className="text-sm text-slate-500">No tasks in this project yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

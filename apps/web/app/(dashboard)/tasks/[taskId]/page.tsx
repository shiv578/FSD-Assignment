'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import type { Task, TaskStatus, Priority } from '@/types';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(180).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});
type UpdateTaskValues = z.infer<typeof updateTaskSchema>;

export default function TaskDetailsPage() {
  const { taskId } = useParams() as { taskId: string };
  const client = useQueryClient();
  const router = useRouter();

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', 'detail', taskId],
    queryFn: () => api<Task>(`/tasks/${taskId}`),
  });

  const form = useForm<UpdateTaskValues>({
    resolver: zodResolver(updateTaskSchema),
    values: task
      ? {
          title: task.title,
          status: task.status,
          priority: task.priority,
        }
      : undefined,
  });

  const updateTask = async (values: UpdateTaskValues) => {
    try {
      await api(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      await client.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });
      // Invalidate project tasks and dashboard to reflect changes
      await client.invalidateQueries({ queryKey: ['dashboard'] });
      if (task?.project?._id) {
        await client.invalidateQueries({ queryKey: ['tasks', task.project._id] });
      }
    } catch {
      form.setError('root', { message: 'Unable to update task' });
    }
  };

  const deleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api(`/tasks/${taskId}`, { method: 'DELETE' });
      const projectId = task?.project?._id;
      if (projectId) {
        await client.invalidateQueries({ queryKey: ['tasks', projectId] });
        router.push(`/projects/${projectId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (e) {
      alert('Failed to delete task');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading task...</p>;
  }

  if (!task) {
    return <p className="text-sm text-red-500">Task not found</p>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          {task.project?._id ? (
            <>
              <Link href={`/projects/${task.project._id}`} className="hover:underline">
                {task.project.name || task.project.key}
              </Link>
              <span>/</span>
            </>
          ) : null}
          <span>{task.title}</span>
        </div>

        <h1 className="text-3xl font-semibold mb-6">Task Details</h1>
      </div>

      <Card className="p-5">
        <form className="space-y-4" onSubmit={form.handleSubmit(updateTask)}>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input {...form.register('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                {...form.register('status')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                {...form.register('priority')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Save changes
            </Button>
            <Button type="button" variant="destructive" onClick={deleteTask}>
              Delete task
            </Button>
          </div>
          {form.formState.errors.root && (
            <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
          )}
        </form>
      </Card>
    </div>
  );
}

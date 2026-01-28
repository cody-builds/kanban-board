import { NextRequest, NextResponse } from 'next/server';
import { reorderTasks } from '@/lib/db';
import { z } from 'zod';

const ReorderSchema = z.object({
  moves: z.array(z.object({
    taskId: z.string(),
    newStatus: z.enum(['todo', 'in_progress', 'review', 'done']),
    newOrder: z.number().int().min(0),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ReorderSchema.parse(body);

    reorderTasks(validated.moves);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error reordering tasks:', error);
    return NextResponse.json({ error: 'Failed to reorder tasks' }, { status: 500 });
  }
}

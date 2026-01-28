import { NextResponse } from 'next/server';
import { getAllTasks, getUsers } from '@/lib/db';
import { COLUMNS } from '@/types';

export async function GET() {
  try {
    const tasks = getAllTasks();
    const users = getUsers();

    const board = {
      id: 'main-board',
      name: 'Cody & Claire Board',
      columns: COLUMNS,
      users,
      tasks,
    };

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Error fetching board:', error);
    return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

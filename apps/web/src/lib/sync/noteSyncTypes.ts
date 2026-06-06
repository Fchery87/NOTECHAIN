export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  version?: number;
}

export interface RemoteNoteChange {
  operationType: 'create' | 'update' | 'delete';
  noteId: string;
  version: number;
  note?: Note;
}

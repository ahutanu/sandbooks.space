// Tag system type definitions

export type TagColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'green'
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'rose';

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  createdAt: number;
  updatedAt: number;
}

export interface TagWithCount extends Tag {
  noteCount: number;
}

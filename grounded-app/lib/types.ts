export interface Meditation {
  id: number;
  title: string;
  text: string;
  date: string;
  folderIds?: number[];
}

export interface Folder {
  id: number;
  name: string;
}

export interface Personality {
  id: string;
  name: string;
  text: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  labels?: { accent?: string; gender?: string };
}

export interface AppSettings {
  voiceId: string;
  voiceSpeed: number;
  voicePause: number;
  personality: string;
}

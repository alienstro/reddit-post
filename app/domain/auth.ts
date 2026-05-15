export type User = {
  username: string;
};

export type AuthState = {
  authenticated: boolean;
  user: User | null;
};

export type Pin = {
  id: number;
  subreddit: string;
  subreddit_lower: string;
  created_at: string;
};

export type PinsResponse = {
  pins: Pin[];
  error?: string;
};

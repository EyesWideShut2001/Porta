export type User = {
  id: string;
  displayName: string;
  email: string;
  token: string;
  imageUrl?: string;
  roles: string[];
};

export type LoginCreds = {
  email: string;
  password: string;
};

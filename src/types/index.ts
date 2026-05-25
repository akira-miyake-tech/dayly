export type Role = "sales" | "manager";

export type User = {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  department?: string;
};

export type ApiResponse<T> = {
  data: T;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
};

export type Pagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

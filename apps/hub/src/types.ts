export type AppEnv = {
  Bindings: {
    DB?: any;
    ENVIRONMENT?: string;
    JWT_SECRET?: string;
  };
  Variables: {
    db: any;
  };
};

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://soschoco:soschoco@localhost:5432/soschoco';
process.env.PORT ??= '3000';
process.env.CORS_ORIGIN ??= 'http://localhost';
process.env.JWT_SECRET ??= 'soschoco-dev-jwt-secret-cambia-esto';

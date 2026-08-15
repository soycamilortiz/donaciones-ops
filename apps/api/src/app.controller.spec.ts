import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get(AppController);
  });

  it('expone metadatos del servicio', () => {
    expect(controller.getInfo()).toEqual({
      name: 'soschoco-api',
      service: 'SOS Chocó',
      docs: '/api/docs',
    });
  });
});

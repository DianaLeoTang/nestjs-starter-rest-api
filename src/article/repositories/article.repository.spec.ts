/*
 * @Author: Diana Tang
 * @Date: 2025-05-06 18:24:06
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/article/repositories/article.repository.spec.ts
 */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { User } from '../../user/entities/user.entity';
import { Article } from '../entities/article.entity';
import { ArticleRepository } from './article.repository';

describe('ArticleRepository', () => {
  let repository: ArticleRepository;

  let dataSource: {
    createEntityManager: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = {
      createEntityManager: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleRepository,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    repository = moduleRef.get<ArticleRepository>(ArticleRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('Get article by id', () => {
    it('should call findOne with correct id', () => {
      const id = 1;

      jest.spyOn(repository, 'findOne').mockResolvedValue(new Article());
      repository.getById(id);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
    });

    it('should return article if found', async () => {
      const expectedOutput: any = {
        id: 1,
        title: 'Default Article',
        post: 'Hello, world!',
        author: new User(),
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(expectedOutput);

      expect(await repository.getById(1)).toEqual(expectedOutput);
    });

    it('should throw NotFoundError when article not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      try {
        await repository.getById(1);
      } catch (error: any) {
        expect(error.constructor).toBe(NotFoundException);
      }
    });
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { CreateBookDto } from './dto/create-book.dto';
import { BookResponseDto } from './dto/book-response.dto';
import { Book } from './entities/book.entity';
import { Category } from './entities/category.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(keyword?: string): Promise<BookResponseDto[]> {
    const books = await this.bookRepository.find({
      relations: { category: true },
      where: keyword ? { title: Like(`%${keyword}%`) } : undefined,
      order: { bookId: 'DESC' },
    });

    return books.map(BookResponseDto.from);
  }

  async create(createBookDto: CreateBookDto): Promise<BookResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { categoryId: createBookDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('존재하지 않는 카테고리입니다.');
    }

    const book = this.bookRepository.create({
      category,
      title: createBookDto.title,
      description: createBookDto.description,
    });

    const savedBook = await this.bookRepository.save(book);

    return BookResponseDto.from(savedBook);
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { BooksService } from './books.service';
import { BookResponseDto } from './dto/book-response.dto';
import { CreateBookDto } from './dto/create-book.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(@Query('keyword') keyword?: string): Promise<BookResponseDto[]> {
    return this.booksService.findAll(keyword);
  }

  @Post()
  async create(@Body() createBookDto: CreateBookDto): Promise<BookResponseDto> {
    return this.booksService.create(createBookDto);
  }
}

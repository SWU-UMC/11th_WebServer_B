import { Controller, Get } from '@nestjs/common';

import { BooksService } from './books.service';
import { BookResponseDto } from './dto/book-response.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(): Promise<BookResponseDto[]> {
    return this.booksService.findAll();
  }
}

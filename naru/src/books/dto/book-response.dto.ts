import type { Book } from '../entities/book.entity';

export class BookResponseDto {
  bookId: number;
  title: string;
  description: string | null;
  categoryName: string;
  isAvailable: boolean;

  static from(book: Book): BookResponseDto {
    const dto = new BookResponseDto();

    dto.bookId = book.bookId;
    dto.title = book.title;
    dto.description = book.description;
    dto.categoryName = book.category.name;
    dto.isAvailable = book.isAvailable;

    return dto;
  }
}

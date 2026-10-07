import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Category } from './category.entity';

@Entity({ name: 'book' })
export class Book {
  @PrimaryGeneratedColumn({ name: 'book_id' })
  bookId: number;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @ManyToOne('Category', 'books')
  @JoinColumn({ name: 'category_id' })
  category: Category;
}

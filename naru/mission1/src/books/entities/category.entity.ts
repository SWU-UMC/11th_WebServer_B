import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import type { Book } from './book.entity';

@Entity({ name: 'category' })
export class Category {
  @PrimaryGeneratedColumn({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @OneToMany('Book', 'category')
  books: Book[];
}

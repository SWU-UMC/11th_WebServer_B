import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseTimeEntity } from './base-time.entity';

@Entity({ name: 'member' })
@Unique(['email'])
@Unique(['nickname'])
export class Member extends BaseTimeEntity {
  @PrimaryGeneratedColumn({ name: 'member_id' })
  memberId: number;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 60 })
  password: string;

  @Column({ type: 'varchar', length: 50 })
  nickname: string;
}

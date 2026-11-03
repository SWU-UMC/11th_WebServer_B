import { ConflictException } from '@nestjs/common';
import { MEMBER_CONFLICTS } from '../common/response.constants';

export class MemberConflictException extends ConflictException {
  readonly code: (typeof MEMBER_CONFLICTS)[keyof typeof MEMBER_CONFLICTS]['code'];

  constructor(field: keyof typeof MEMBER_CONFLICTS) {
    const error = MEMBER_CONFLICTS[field];
    super(error.message);
    this.code = error.code;
  }
}

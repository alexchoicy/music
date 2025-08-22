import { Injectable } from '@nestjs/common';
import { User } from '@music/api/schemas/user.schema';

@Injectable()
export class AppService {
  getHello(): string {
    const user: User = { name: 'John Doe', pnumber: 1234567890 };

    return `Hello ${user.name}! ${user.pnumber}`;
  }
}

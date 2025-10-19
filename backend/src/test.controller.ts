// backend/src/test.controller.ts
import { Controller, Get, Param } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get('hello')
  getHello() {
    return 'Hello from the static route!';
  }

  @Get(':param')
  getParam(@Param('param') param: string) {
    return { message: 'Dynamic route is working!', receivedParam: param };
  }
}
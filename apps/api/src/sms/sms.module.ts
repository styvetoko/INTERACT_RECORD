import { Global, Module } from '@nestjs/common';
import { FakeSmsProvider } from './fake-sms.provider';
import { SMS_PROVIDER } from './sms.provider';

@Global()
@Module({
  providers: [FakeSmsProvider, { provide: SMS_PROVIDER, useExisting: FakeSmsProvider }],
  exports: [SMS_PROVIDER, FakeSmsProvider],
})
export class SmsModule {}

import { IsNumber, IsPositive, Max } from 'class-validator';

export class DepositDto {
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(1_000_000)
  amount: number;
}

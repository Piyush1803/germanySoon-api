import { IsEmail, IsInt, IsNotEmpty } from 'class-validator';

export class BookAppointmentDto {
  @IsInt()
  @IsNotEmpty()
  slotId: number;

  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;
}
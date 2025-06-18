import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCalendarDto {
    @IsNotEmpty()
    @IsString()
    summary: string;

    @IsString()
    description?: string;

    @IsNotEmpty()
    startTime: string;

    @IsNotEmpty()
    endTime: string;
}

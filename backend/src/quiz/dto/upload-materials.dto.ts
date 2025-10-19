import { IsNotEmpty, IsUrl } from 'class-validator';

export class UploadMaterialsDto {
  @IsUrl({}, { message: 'Proszę podać prawidłowy adres URL do YouTube.' })
  @IsNotEmpty({ message: 'Link do YouTube jest wymagany.' })
  youtubeUrl: string;
}
/*
 * @Author: Diana Tang
 * @Date: 2025-05-12 14:47:52
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/user/dtos/update-user.dto.ts
 */
export class UpdateUserDto {
  name?: string;
  username?: string;
  password?: string;
  email?: string;
  roles?: string[];
  isAccountDisabled?: boolean;
}

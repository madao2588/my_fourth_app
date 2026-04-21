from enum import Enum


class UserRole(str, Enum):
    MADAO = "madao"
    MADAO1 = "madao1"
    MADAO2 = "madao2"
    MADAO3 = "madao3"
    MADAO4 = "madao4"


ROLE_SORT_ORDER = {
    UserRole.MADAO.value: 0,
    UserRole.MADAO1.value: 1,
    UserRole.MADAO2.value: 2,
    UserRole.MADAO3.value: 3,
    UserRole.MADAO4.value: 4,
}

type User = { id: string };

export const fetchUser = async (id: string) => ({ id });

const repository = {
  save(user: User) {
    return user.id;
  },
};

export { repository };

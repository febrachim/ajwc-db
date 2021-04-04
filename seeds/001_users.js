import UserModel from '../src/modules/user/model';

exports.seed = (knex, Promise) => Promise.join(
  // Deletes ALL existing entries
  knex('users').del(),
  knex('users').insert([
    {
      user_id: 1,
      username: 'tes',
      first_name: 'Andrew',
      last_name: 'Junior',
      phone: '08562905595',
      email: 'andrew@skyshi.com',
      status: 1,
      password: UserModel.User.hashPasswordSync('andrew'),
    },
  ]));

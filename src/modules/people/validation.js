import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

const number = { pattern: /^[0-9]+$/, message: validateMsg.number_format };

constraints.createPeople = {
  name: { presence: true },
};

constraints.createPeopleCompany = {
  id: { presence: { message: validateMsg.company_id },
    format: { pattern: number.pattern, message: validateMsg.company_format } },
  status: { presence: true, format: number },
};

export default { constraints };

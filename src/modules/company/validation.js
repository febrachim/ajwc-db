import { Messages } from './messages';

const { validateMsg } = Messages;

export const constraints = {};

constraints.createCompany = {
  name: { presence: true },
  country_id: {
    numericality: {
      onlyInteger: true,
      greaterThan: 0,
    },
  },
};

export default { constraints };

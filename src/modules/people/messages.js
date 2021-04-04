export const Messages = {
  peopleMsg: {
    create_success: name => `<strong>${name}</strong> has been added to people`,
    create_duplicate: name => `<strong>${name}</strong> is already used`,
    not_found: 'People not found',
    edit_success: 'Edit people success',
    delete_success: 'Delete people success',
  },
  validateMsg: {
    country_id: '^Country needs to be selected',
    company_id: '^Company needs to be selected',
    number_format: 'not a valid input',
    company_format: '^Company not a valid input',
    rel_id: '^Relationship needs to be selected',
    rel_format: '^Relationship not a valid input',
  },
};

export default { Messages };

export const Messages = {
  eventMsg: {
    create_success: name => `<strong>${name}</strong> has been added to events`,
    create_duplicate: name => `<strong>${name}</strong> is already created`,
    not_found: 'Event not found',
    edit_success: 'Edit event success',
    delete_success: 'Delete event success',
  },
  validateMsg: {
  },
};

export default { Messages };

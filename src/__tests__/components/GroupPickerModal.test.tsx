/**
 * Component tests for GroupPickerModal — search/select/create/delete of
 * locally-saved WhatsApp group names.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GroupPickerModal from '../../components/GroupPickerModal';

const STORAGE_KEY = 'celebconnect_saved_groups';

const seedGroups = async (names: string[]) => {
  const groups = names.map((name, i) => ({
    id: String(i + 1),
    name,
    createdAt: new Date().toISOString(),
  }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  return groups;
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('GroupPickerModal — rendering', () => {
  it('shows the empty state when there are no saved groups', async () => {
    const { getByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('No saved groups yet — type a name below to create one.')).toBeTruthy();
    });
  });

  it('lists previously saved groups', async () => {
    await seedGroups(['Family', 'Work Friends']);
    const { getByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => {
      expect(getByText('Family')).toBeTruthy();
      expect(getByText('Work Friends')).toBeTruthy();
    });
  });
});

describe('GroupPickerModal — search', () => {
  it('filters the list as the user types', async () => {
    await seedGroups(['Family', 'Work Friends']);
    const { getByTestId, getByText, queryByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => expect(getByText('Family')).toBeTruthy());

    fireEvent.changeText(getByTestId('group-picker-search'), 'fam');

    await waitFor(() => {
      expect(getByText('Family')).toBeTruthy();
      expect(queryByText('Work Friends')).toBeNull();
    });
  });
});

describe('GroupPickerModal — selecting', () => {
  it('calls onSelect with the group name and closes', async () => {
    await seedGroups(['Family']);
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId, getByText } = render(
      <GroupPickerModal visible onSelect={onSelect} onClose={onClose} />
    );
    await waitFor(() => expect(getByText('Family')).toBeTruthy());

    fireEvent.press(getByTestId('select-group-1'));

    expect(onSelect).toHaveBeenCalledWith('Family');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('GroupPickerModal — creating a new group', () => {
  it('offers a "+ Create" option for a name that does not exist yet', async () => {
    const { getByTestId, getByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    fireEvent.changeText(getByTestId('group-picker-search'), 'Book Club');

    await waitFor(() => {
      expect(getByText('+ Create "Book Club"')).toBeTruthy();
    });
  });

  it('does not offer to create a duplicate of an existing group', async () => {
    await seedGroups(['Family']);
    const { getByTestId, queryByText, getByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => expect(getByText('Family')).toBeTruthy());

    fireEvent.changeText(getByTestId('group-picker-search'), 'family');

    await waitFor(() => {
      expect(queryByText('+ Create "family"')).toBeNull();
    });
  });

  it('saves the new group and calls onSelect/onClose when created', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <GroupPickerModal visible onSelect={onSelect} onClose={onClose} />
    );

    fireEvent.changeText(getByTestId('group-picker-search'), 'Book Club');
    await waitFor(() => expect(getByTestId('group-picker-create')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('group-picker-create'));
    });

    expect(onSelect).toHaveBeenCalledWith('Book Club');
    expect(onClose).toHaveBeenCalled();

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted = JSON.parse(raw as string);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe('Book Club');
  });
});

describe('GroupPickerModal — deleting', () => {
  it('removes a saved group after the user confirms', async () => {
    await seedGroups(['Family', 'Work Friends']);

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((...args: unknown[]) => {
        const buttons = args[2] as any[];
        const confirm = buttons?.find((b: any) => b.style === 'destructive');
        confirm?.onPress?.();
      });

    const { getByTestId, getByText, queryByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => expect(getByText('Family')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('delete-group-1'));
    });

    await waitFor(() => {
      expect(queryByText('Family')).toBeNull();
      expect(getByText('Work Friends')).toBeTruthy();
    });

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const persisted = JSON.parse(raw as string);
    expect(persisted).toHaveLength(1);
    expect(persisted[0].name).toBe('Work Friends');

    alertSpy.mockRestore();
  });

  it('does not remove the group if the user cancels', async () => {
    await seedGroups(['Family']);

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {
        // Simulate the user dismissing the dialog — no button pressed.
      });

    const { getByTestId, getByText } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={jest.fn()} />
    );
    await waitFor(() => expect(getByText('Family')).toBeTruthy());

    fireEvent.press(getByTestId('delete-group-1'));

    expect(getByText('Family')).toBeTruthy();

    alertSpy.mockRestore();
  });
});

describe('GroupPickerModal — closing', () => {
  it('calls onClose when the close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <GroupPickerModal visible onSelect={jest.fn()} onClose={onClose} />
    );
    fireEvent.press(getByTestId('group-picker-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

import { render, screen, userEvent } from '@testing-library/react-native';
import { PredictionScoreInput } from '@/host/predictions/components/prediction-score-input';

describe('PredictionScoreInput (PREDICTIONS-1)', () => {
  it('renders an empty field when value is null', async () => {
    await render(<PredictionScoreInput label="Home" value={null} onChange={jest.fn()} editable />);
    expect(screen.getByLabelText('Home score').props.value).toBe('');
  });

  it('renders the numeric value as text', async () => {
    await render(<PredictionScoreInput label="Home" value={3} onChange={jest.fn()} editable />);
    expect(screen.getByLabelText('Home score').props.value).toBe('3');
  });

  it('calls onChange with a parsed number when typing digits', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<PredictionScoreInput label="Away" value={null} onChange={onChange} editable />);

    await user.type(screen.getByLabelText('Away score'), '4');

    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('calls onChange with null when the field is cleared', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<PredictionScoreInput label="Away" value={2} onChange={onChange} editable />);

    await user.clear(screen.getByLabelText('Away score'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is not editable when editable=false (locked match, ADR-023)', async () => {
    await render(<PredictionScoreInput label="Home" value={1} onChange={jest.fn()} editable={false} />);
    expect(screen.getByLabelText('Home score').props.editable).toBe(false);
  });
});

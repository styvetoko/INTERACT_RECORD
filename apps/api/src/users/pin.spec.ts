import { pinWeakness } from './pin';

describe('règles du code PIN', () => {
  it.each(['2580', '19374', '804216'])('accepte %s', (pin) => expect(pinWeakness(pin)).toBeNull());
  it.each(['123', '1234567', 'abcd', '0000', '111111', '1234', '6543', '890123', '3210'])('refuse %s', (pin) =>
    expect(pinWeakness(pin)).not.toBeNull(),
  );
});

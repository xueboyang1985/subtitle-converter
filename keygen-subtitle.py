#!/usr/bin/env python3
"""SUBTITLE-CONVERTER-PRO key generator/verifier.

Usage:
  python keygen-subtitle.py               # Generate 1 key
  python keygen-subtitle.py -n 5           # Generate 5 keys
  python keygen-subtitle.py -v KEY         # Verify a key
"""

import argparse
import random

PRO_SECRET = sum(ord(c) for c in 'SUBTITLE-CONVERTER-PRO-2024')


def generate_key():
    parts = [str(random.randint(1000, 9999)) for _ in range(3)]
    s = sum(ord(c) * (i + 1) for i, c in enumerate(''.join(parts)))
    s ^= PRO_SECRET
    checksum = str(s % 10) * 4
    return f"SUBTITLE-{parts[0]}-{parts[1]}-{parts[2]}-{checksum}"


def validate_key(key):
    parts = key.split('-')
    if len(parts) != 5 or parts[0] != 'SUBTITLE':
        return False
    for i in range(1, 5):
        if len(parts[i]) != 4 or not parts[i].isdigit():
            return False
    s = sum(ord(c) * (i + 1) for i, c in enumerate(''.join(parts[1:4])))
    s ^= PRO_SECRET
    return parts[4] == str(s % 10) * 4


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Subtitle Converter PRO key tool')
    parser.add_argument('-n', type=int, default=1, help='Number of keys to generate')
    parser.add_argument('-v', metavar='KEY', help='Verify a key')
    args = parser.parse_args()

    if args.v:
        print(f"[{'GOOD' if validate_key(args.v) else 'BAD'}] {args.v}")
    else:
        for _ in range(args.n):
            print(generate_key())

# A script that take a directory, read all images from directory, runs pytesseract.image_to_data on them and save results to a single json file.


import os
import sys
import pytesseract
import json
from PIL import Image


source = sys.argv[1]
destination = sys.argv[2]

LEVELS = {
    'page_num': 1,
    'block_num': 2,
    'par_num': 3,
    'line_num': 4,
    'word_num': 5
}


def extract_data(tesseract_output):
    n_boxes = len(tesseract_output['level'])
    data = {}

    for i in range(n_boxes):
        levelIdx = tesseract_output['level'][i]
        levelName = list(LEVELS.keys())[list(LEVELS.values()).index(levelIdx)]

        # Only word_num or continue
        if levelName != 'word_num':
            continue

        if 'words' not in data:
            data['words'] = []

        # Ignore empty trimmed boxes
        if tesseract_output['text'][i].strip() == '':
            continue

        data['words'].append({
            'text': tesseract_output['text'][i],
            'left': tesseract_output['left'][i],
            'top': tesseract_output['top'][i],
            'width': tesseract_output['width'][i],
            'height': tesseract_output['height'][i]
        })

    return data


def extract_ocr_data(name):
    # Read image from source directory
    with Image.open(os.path.join(source, name)) as image:

        print('Extracting ocr from ' + name)

        # Run pytesseract.image_to_data on image
        tesseract_output = pytesseract.image_to_data(
            image, output_type=pytesseract.Output.DICT)

        # Extract data from tesseract output
        data = extract_data(tesseract_output)

        # Add image name to data
        data['image'] = name
        data['height'] = image.height
        data['width'] = image.width

        return data


def main(source, destination):
    # Make the directory if it doesn't exist
    if not os.path.exists(destination):
        os.makedirs(destination)

    data = []

    # Read all images from source directory
    for name in os.listdir(source):
        if name.endswith('.jpg'):
            data.append(extract_ocr_data(name))

    # Write data to json file
    with open(os.path.join(destination, 'data.json'), 'w') as f:
        f.write(json.dumps(data))


if __name__ == '__main__':
    main(source, destination)

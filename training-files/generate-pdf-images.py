# A script that take a zip file, read all contents to memory and for all pdf files, extract the images and save them in a folder.

import os
import sys
from zipfile import ZipFile
from pdf2image import convert_from_bytes

source = sys.argv[1]
destination = sys.argv[2]


def extract_images(source, destination):
    with ZipFile(source, 'r') as zip:
        for name in zip.namelist():
            if name.endswith('.pdf'):
                print('Extracting images from ' + name)

                # Read contents of the pdf file to memory
                pdf_bytes = zip.read(name)

                # Convert pdf to images
                images = convert_from_bytes(pdf_bytes, dpi=144, fmt="jpeg")

                file_name = name.split('.')[0]

                # Make the directory if it doesn't exist
                if not os.path.exists(destination):
                    os.makedirs(destination)

                # Save images to destination folder
                for i, image in enumerate(images):
                    image.save(os.path.join(
                        destination, file_name + '_' + str(i + 1) + '.jpg'))


if __name__ == '__main__':
    extract_images(source, destination)

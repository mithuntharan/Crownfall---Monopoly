CXX ?= g++
CXXFLAGS ?= -O3 -std=c++17 -Wall -Wextra -Icpp/include
SRC = $(wildcard cpp/src/*.cpp)
TARGET = bin/monopoly_engine

all: $(TARGET)

$(TARGET): $(SRC)
	@mkdir -p bin
	$(CXX) $(CXXFLAGS) $(SRC) -o $(TARGET)

clean:
	rm -f $(TARGET)

.PHONY: all clean

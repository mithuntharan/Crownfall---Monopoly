cmake_minimum_required(VERSION 3.15)
project(CrownfallEngine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

file(GLOB SOURCES "src/*.cpp")

add_executable(crownfall_engine ${SOURCES})

target_compile_features(crownfall_engine PUBLIC cxx_std_17)
target_include_directories(crownfall_engine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

if (MSVC)
    target_compile_options(crownfall_engine PRIVATE /utf-8)
endif()

# Also copy to monopoly_engine for bridge compatibility
add_custom_command(TARGET crownfall_engine POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        $<TARGET_FILE:crownfall_engine>
        ${CMAKE_CURRENT_SOURCE_DIR}/../bin/monopoly_engine.exe
)


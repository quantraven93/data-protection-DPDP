// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "MercuryLawyerClone",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "MercuryLawyerClone", targets: ["MercuryLawyerClone"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "MercuryLawyerClone",
            dependencies: [],
            path: ".",
            exclude: ["README.md"],
            sources: [
                "MercuryLawyerCloneApp.swift",
                "Models",
                "Views",
                "ViewModels",
                "Services"
            ]
        )
    ]
)

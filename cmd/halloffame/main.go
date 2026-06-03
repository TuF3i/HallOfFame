package main

import (
	"fmt"
	"os"

	"halloffame/internal/server"
	"halloffame/internal/botsvr"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "halloffame",
	Short: "HallOfFame - QQ group quotes showcase",
	Run: func(cmd *cobra.Command, args []string) {
		all, _ := cmd.Flags().GetBool("all")
		if all {
			go server.RunServer()
			botsvr.RunBotServer()
			select {}
		} else {
			server.RunServer()
		}
	},
}

func main() {
	rootCmd.Flags().BoolP("all", "a", false, "Start both API server and Bot server")
	rootCmd.AddCommand(&cobra.Command{
		Use:   "server",
		Short: "Start the main API server",
		Run: func(cmd *cobra.Command, args []string) {
			server.RunServer()
		},
	})
	rootCmd.AddCommand(&cobra.Command{
		Use:   "bot",
		Short: "Start the Bot API server (separate port, no auth)",
		Run: func(cmd *cobra.Command, args []string) {
			botsvr.RunBotServer()
		},
	})

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
